/*
* tablesaw: A set of plugins for responsive tables
* Swipe Toggle: swipe gesture (or buttons) to navigate which columns are shown.
* Copyright (c) 2013 Filament Group, Inc.
* MIT License
*/

(function(){

	function getSwipeConfig() {
		return $.extend({
			horizontalThreshold: 15,
			verticalThreshold: 30
		}, typeof TablesawConfig !== "undefined" ? TablesawConfig.swipe : {} );
	}

	var classes = {
		// TODO duplicate class, also in tables.js
		toolbar: "tablesaw-bar",
		hideBtn: "disabled",
		persistWidths: "tablesaw-fix-persist",
		allColumnsVisible: 'tablesaw-all-cols-visible'
	};
	var attrs = {
		disableTouchEvents: "data-tablesaw-no-touch"
	};

	function createSwipeTable( tbl, $table ){

		var $btns = $( "<div class='tablesaw-advance'></div>" );
		var $prevBtn = $( "<a href='#' class='tablesaw-nav-btn btn btn-micro left' title='Previous Column'></a>" ).appendTo( $btns );
		var $nextBtn = $( "<a href='#' class='tablesaw-nav-btn btn btn-micro right' title='Next Column'></a>" ).appendTo( $btns );

		var $headerCells = tbl._getPrimaryHeaders();
		var $headerCellsNoPersist = $headerCells.not( '[data-tablesaw-priority="persist"]' );
		var headerWidths = [];
		var $head = $( document.head || 'head' );
		var tableId = $table.attr( 'id' );

		if( !$headerCells.length ) {
			throw new Error( "tablesaw swipe: no header cells found. Are you using <th> inside of <thead>?" );
		}

		$table.addClass( "tablesaw-swipe" );

		// Calculate initial widths
		$headerCells.each(function() {
			var width = this.offsetWidth;
			headerWidths.push( width );
		});

		$btns.appendTo( $table.prev().filter( '.tablesaw-bar' ) );

		if( !tableId ) {
			tableId = 'tableswipe-' + Math.round( Math.random() * 10000 );
			$table.attr( 'id', tableId );
		}

		function $getCells( headerCell ) {
			return $( headerCell.cells ).add( headerCell );
		}

		function showColumn( headerCell ) {
			$getCells( headerCell ).removeClass( 'tablesaw-cell-hidden' );
		}

		function hideColumn( headerCell ) {
			$getCells( headerCell ).addClass( 'tablesaw-cell-hidden' );
		}

		function persistColumn( headerCell ) {
			$getCells( headerCell ).addClass( 'tablesaw-cell-persist' );
		}

		function isPersistent( headerCell ) {
			return $( headerCell ).is( '[data-tablesaw-priority="persist"]' );
		}

		function unmaintainWidths() {
			$table.removeClass( classes.persistWidths );
			$( '#' + tableId + '-persist' ).remove();
		}

		function maintainWidths() {
			var prefix = '#' + tableId + '.tablesaw-swipe ',
				styles = [],
				tableWidth = $table.width(),
				hash = [],
				newHash;

			$headerCells.each(function( index ) {
				var width;
				if( isPersistent( this ) ) {
					width = this.offsetWidth;

					// Only save width on non-greedy columns (take up less than 75% of table width)
					if( width < tableWidth * 0.75 ) {
						hash.push( index + '-' + width );
						styles.push( prefix + ' .tablesaw-cell-persist:nth-child(' + ( index + 1 ) + ') { width: ' + width + 'px; }' );
					}
				}
			});
			newHash = hash.join( '_' );

			$table.addClass( classes.persistWidths );

			var $style = $( '#' + tableId + '-persist' );
			// If style element not yet added OR if the widths have changed
			if( !$style.length || $style.data( 'tablesaw-hash' ) !== newHash ) {
				// Remove existing
				$style.remove();

				if( styles.length ) {
					$( '<style>' + styles.join( "\n" ) + '</style>' )
						.attr( 'id', tableId + '-persist' )
						.data( 'tablesaw-hash', newHash )
						.appendTo( $head );
				}
			}
		}

		function getNext(){
			var next = [],
				checkFound;

			$headerCellsNoPersist.each(function( i ) {
				var $t = $( this ),
					isHidden = $t.css( "display" ) === "none" || $t.is( ".tablesaw-cell-hidden" );

				if( !isHidden && !checkFound ) {
					checkFound = true;
					next[ 0 ] = i;
				} else if( isHidden && checkFound ) {
					next[ 1 ] = i;

					return false;
				}
			});

			return next;
		}

		function getPrev(){
			var next = getNext();
			return [ next[ 1 ] - 1 , next[ 0 ] - 1 ];
		}

		function nextpair( fwd ){
			return fwd ? getNext() : getPrev();
		}

		function canAdvance( pair ){
			return pair[ 1 ] > -1 && pair[ 1 ] < $headerCellsNoPersist.length;
		}

		function matchesMedia() {
			var matchMedia = $table.attr( "data-tablesaw-swipe-media" );
			return !matchMedia || ( "matchMedia" in win ) && win.matchMedia( matchMedia ).matches;
		}

		function fakeBreakpoints() {
			if( !matchesMedia() ) {
				return;
			}

			var	containerWidth = $table.parent().width(),
				persist = [],
				sum = 0,
				sums = [],
				visibleNonPersistantCount = $headerCells.length;

			$headerCells.each(function( index ) {
				var $t = $( this ),
					isPersist = $t.is( '[data-tablesaw-priority="persist"]' );

				persist.push( isPersist );
				sum += headerWidths[ index ];
				sums.push( sum );

				// is persistent or is hidden
				if( isPersist || sum > containerWidth ) {
					visibleNonPersistantCount--;
				}
			});

			// We need at least one column to swipe.
			var needsNonPersistentColumn = visibleNonPersistantCount === 0;

			$headerCells.each(function( index ) {
				if( persist[ index ] ) {

					// for visual box-shadow
					persistColumn( this );
					return;
				}

				if( sums[ index ] <= containerWidth || needsNonPersistentColumn ) {
					needsNonPersistentColumn = false;
					showColumn( this );
				} else {
					hideColumn( this );
				}
			});

			unmaintainWidths();
			$table.trigger( 'tablesawcolumns' );
		}

		function advance( fwd ){
			var pair = nextpair( fwd );
			if( canAdvance( pair ) ){
				if( isNaN( pair[ 0 ] ) ){
					if( fwd ){
						pair[0] = 0;
					}
					else {
						pair[0] = $headerCellsNoPersist.length - 1;
					}
				}

				maintainWidths();

				hideColumn( $headerCellsNoPersist.get( pair[ 0 ] ) );
				showColumn( $headerCellsNoPersist.get( pair[ 1 ] ) );

				$table.trigger( 'tablesawcolumns' );
			}
		}

		$prevBtn.add( $nextBtn ).on( "click", function( e ){
			advance( !!$( e.target ).closest( $nextBtn ).length );
			e.preventDefault();
		});

		function getCoord( event, key ) {
			return ( event.touches || event.originalEvent.touches )[ 0 ][ key ];
		}

		if( !$table.is( "[" + attrs.disableTouchEvents + "]" ) ) {

			$table
				.on( "touchstart.swipetoggle", function( e ){
					var originX = getCoord( e, 'pageX' ),
						originY = getCoord( e, 'pageY' ),
						x,
						y;

					$( win ).off( "resize", fakeBreakpoints );

					$( this )
						.on( "touchmove", function( e ){
							x = getCoord( e, 'pageX' );
							y = getCoord( e, 'pageY' );
							var cfg = getSwipeConfig();
							if( Math.abs( x - originX ) > cfg.horizontalThreshold && Math.abs( y - originY ) < cfg.verticalThreshold ) {
								e.preventDefault();
							}
						})
						.on( "touchend.swipetoggle", function(){
							var cfg = getSwipeConfig();
							if( Math.abs( y - originY ) < cfg.verticalThreshold ) {
								if( x - originX < -1 * cfg.horizontalThreshold ){
									advance( true );
								}
								if( x - originX > cfg.horizontalThreshold ){
									advance( false );
								}
							}

							window.setTimeout(function() {
								$( win ).on( "resize", fakeBreakpoints );
							}, 300);
							$( this ).off( "touchmove touchend" );
						});
				});
		}

		$table
			.on( "tablesawcolumns.swipetoggle", function(){
				var canGoPrev = canAdvance( getPrev() );
				var canGoNext = canAdvance( getNext() );
				$prevBtn[ canGoPrev ? "removeClass" : "addClass" ]( classes.hideBtn );
				$nextBtn[ canGoNext ? "removeClass" : "addClass" ]( classes.hideBtn );

				$prevBtn.closest( "." + classes.toolbar )[ !canGoPrev && !canGoNext ? 'addClass' : 'removeClass' ]( classes.allColumnsVisible );
			})
			.on( "tablesawnext.swipetoggle", function(){
				advance( true );
			} )
			.on( "tablesawprev.swipetoggle", function(){
				advance( false );
			} )
			.on( "tablesawdestroy.swipetoggle", function(){
				var $t = $( this );

				$t.removeClass( 'tablesaw-swipe' );
				$t.prev().filter( '.tablesaw-bar' ).find( '.tablesaw-advance' ).remove();
				$( win ).off( "resize", fakeBreakpoints );

				$t.off( ".swipetoggle" );
			})
			.on( "tablesawrefresh", function() {
				// manual refresh
				headerWidths = [];
				$headerCells.each(function() {
					var width = this.offsetWidth;
					headerWidths.push( width );
				});

				fakeBreakpoints();
			});

		fakeBreakpoints();
		$( win ).on( "resize", fakeBreakpoints );
	}



	// on tablecreate, init
	$( document ).on( "tablesawcreate", function( e, tablesaw ){
		if( tablesaw.mode === 'swipe' ){
			createSwipeTable( tablesaw, tablesaw.$table );
		}

	} );

}());
